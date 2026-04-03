export const PRODUCT_TYPES = {
  PHYSICAL: 'PHYSICAL',
  DIGITAL: 'DIGITAL',
  PERSONALIZED: 'PERSONALIZED',
} as const;

export type ProductType = (typeof PRODUCT_TYPES)[keyof typeof PRODUCT_TYPES];

export const PRODUCT_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;

export type ProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];

export const PERSONALIZATION_FIELD_TYPES = {
  TEXT: 'TEXT',
  TEXTAREA: 'TEXTAREA',
  SELECT: 'SELECT',
  FILE_UPLOAD: 'FILE_UPLOAD',
  COLOR_PICKER: 'COLOR_PICKER',
  NUMBER: 'NUMBER',
} as const;

export type PersonalizationFieldType =
  (typeof PERSONALIZATION_FIELD_TYPES)[keyof typeof PERSONALIZATION_FIELD_TYPES];
