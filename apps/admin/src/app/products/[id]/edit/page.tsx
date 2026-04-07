import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { productService } from '@vee/core';
import { ProductEditForm } from './ProductEditForm';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await productService.getById(id);
  return { title: product ? `Edit: ${product.name}` : 'Edit Product' };
}

export default async function ProductEditPage({ params }: Props) {
  const { id } = await params;
  const product = await productService.getById(id);

  if (!product) {
    notFound();
  }

  return <ProductEditForm product={product} />;
}
