import { NextResponse } from 'next/server';
import { db } from '@vee/db';

type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  children: CategoryNode[];
};

function buildTree(
  categories: Omit<CategoryNode, 'children'>[] & { parentId: string | null }[],
  parentId: string | null = null,
): CategoryNode[] {
  return categories
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({
      ...c,
      children: buildTree(categories, c.id),
    }));
}

export async function GET() {
  try {
    const categories = await db.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        imageUrl: true,
        sortOrder: true,
        parentId: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    const tree = buildTree(categories);

    return NextResponse.json(tree);
  } catch (err) {
    console.error('[GET /api/categories]', err);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
