export type OpenFoodFactsProduct = {
  productName: string | null;
  ingredientsText: string | null;
};

export async function fetchOpenFoodFactsProduct(
  barcode: string
): Promise<OpenFoodFactsProduct> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'SatvikScan/1.0 (Expo)',
    },
  });

  if (!res.ok) {
    throw new Error(`Open Food Facts request failed (${res.status})`);
  }

  const data = (await res.json()) as any;
  const product = data?.product;

  const productName =
    (typeof product?.product_name === 'string' && product.product_name.trim()) ||
    (typeof product?.product_name_en === 'string' && product.product_name_en.trim()) ||
    null;

  const ingredientsText =
    (typeof product?.ingredients_text === 'string' && product.ingredients_text.trim()) ||
    (typeof product?.ingredients_text_en === 'string' && product.ingredients_text_en.trim()) ||
    null;

  return { productName, ingredientsText };
}

