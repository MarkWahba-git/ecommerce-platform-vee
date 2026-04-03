import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create default admin user
  const passwordHash = await hash('admin123', 12);

  await prisma.user.upsert({
    where: { email: 'admin@vee-handmade.de' },
    update: {},
    create: {
      email: 'admin@vee-handmade.de',
      name: 'Vee Admin',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      emailVerified: new Date(),
    },
  });

  // Create default categories
  const categories = [
    { slug: 'jewelry', name: 'Jewelry', sortOrder: 1 },
    { slug: 'home-decor', name: 'Home Decor', sortOrder: 2 },
    { slug: 'accessories', name: 'Accessories', sortOrder: 3 },
    { slug: 'digital-art', name: 'Digital Art', sortOrder: 4 },
    { slug: 'custom-orders', name: 'Custom Orders', sortOrder: 5 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
