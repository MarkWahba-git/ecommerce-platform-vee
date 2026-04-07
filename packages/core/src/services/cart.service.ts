import { db } from '@vee/db';
import type { AddToCartInput, UpdateCartItemInput } from '@vee/shared';
import { couponService } from './coupon.service';

export class CartService {
  /** Get or create a cart by customer ID or session ID */
  async getOrCreate(customerId?: string, sessionId?: string) {
    if (!customerId && !sessionId) {
      throw new Error('Either customerId or sessionId is required');
    }

    const where = customerId ? { customerId } : { sessionId };
    let cart = await db.cart.findFirst({
      where,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                name: true,
                type: true,
                basePrice: true,
              },
            },
            variant: { select: { id: true, name: true, price: true } },
          },
        },
      },
    });

    if (!cart) {
      cart = await db.cart.create({
        data: { customerId, sessionId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  type: true,
                  basePrice: true,
                },
              },
              variant: { select: { id: true, name: true, price: true } },
            },
          },
        },
      });
    }

    return cart;
  }

  /** Add an item to cart */
  async addItem(cartId: string, input: AddToCartInput) {
    const product = await db.product.findUniqueOrThrow({
      where: { id: input.productId },
      select: { basePrice: true },
    });

    let unitPrice = Number(product.basePrice);

    // Check for variant price override
    if (input.variantId) {
      const variant = await db.productVariant.findUnique({
        where: { id: input.variantId },
        select: { price: true },
      });
      if (variant?.price) {
        unitPrice = Number(variant.price);
      }
    }

    // Check for existing cart item with same product+variant+personalization
    const existingItem = await db.cartItem.findFirst({
      where: {
        cartId,
        productId: input.productId,
        variantId: input.variantId ?? null,
      },
    });

    if (existingItem && !input.personalization) {
      return db.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: { increment: input.quantity } },
      });
    }

    return db.cartItem.create({
      data: {
        cartId,
        productId: input.productId,
        variantId: input.variantId,
        quantity: input.quantity,
        unitPrice,
        personalization: input.personalization ?? undefined,
      },
    });
  }

  /** Update item quantity */
  async updateItem(itemId: string, input: UpdateCartItemInput) {
    return db.cartItem.update({
      where: { id: itemId },
      data: { quantity: input.quantity },
    });
  }

  /** Remove item from cart */
  async removeItem(itemId: string) {
    return db.cartItem.delete({ where: { id: itemId } });
  }

  /** Apply coupon code with full validation against cart context */
  async applyCoupon(cartId: string, code: string) {
    // Load cart with items to validate against full cart context
    const cart = await db.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: {
        items: {
          select: {
            productId: true,
            quantity: true,
            unitPrice: true,
          },
        },
      },
    });

    const subtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0,
    );

    const cartData = {
      customerId: cart.customerId ?? undefined,
      items: cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
      subtotal,
    };

    const result = await couponService.validate(code, cartData);
    if (!result.valid) {
      throw new Error(result.reason);
    }

    return db.cart.update({
      where: { id: cartId },
      data: { couponCode: code },
    });
  }

  /** Remove coupon from cart */
  async removeCoupon(cartId: string) {
    return db.cart.update({
      where: { id: cartId },
      data: { couponCode: null },
    });
  }

  /** Merge guest cart into customer cart (on login) */
  async mergeGuestCart(sessionId: string, customerId: string) {
    const guestCart = await db.cart.findFirst({
      where: { sessionId },
      include: { items: true },
    });
    if (!guestCart || guestCart.items.length === 0) return;

    const customerCart = await this.getOrCreate(customerId);

    for (const item of guestCart.items) {
      await this.addItem(customerCart.id, {
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        quantity: item.quantity,
        personalization: item.personalization as Record<string, unknown> | undefined,
      });
    }

    await db.cart.delete({ where: { id: guestCart.id } });
  }
}

export const cartService = new CartService();
