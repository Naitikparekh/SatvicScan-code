import type { OpenFoodFactsProduct } from '../types';

/**
 * Fetch product info from Open Food Facts API v2.
 * Returns productName, brands, and ingredientsText (English preferred).
 */
export async function fetchProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'SatvikScan/1.0 (Expo; github.com/satvicscan)',
    },
  });

  if (!res.ok) {
    throw new Error(`Open Food Facts request failed (${res.status})`);
  }

  const data = (await res.json()) as any;
  const product = data?.product;

  if (!product) {
    return { productName: null, brands: null, ingredientsText: null };
  }

  const productName =
    (typeof product.product_name_en === 'string' && product.product_name_en.trim()) ||
    (typeof product.product_name === 'string' && product.product_name.trim()) ||
    null;

  const brands =
    (typeof product.brands === 'string' && product.brands.trim()) || null;

  const ingredientsText =
    (typeof product.ingredients_text_en === 'string' && product.ingredients_text_en.trim()) ||
    (typeof product.ingredients_text === 'string' && product.ingredients_text.trim()) ||
    null;

  return {
    productName: productName || null,
    brands: brands || null,
    ingredientsText: ingredientsText || null,
  };
}
