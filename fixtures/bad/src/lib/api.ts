// Deliberately fake values: R21 is about where secrets live, not what they are.
// expect-claude: R21
const API_SECRET = "fixture-not-a-real-secret";
// expect-claude: R21
const paymentSecret = import.meta.env.VITE_PAYMENT_SECRET;

// expect-lint: R19
export const parse = (raw: any) => JSON.parse(raw);

// expect-lint: R25
export const retries: number = "3";

// expect-lint: R02
export const buildUrl = (
  path: string,
  query: string,
) => `${path}?${query}`;

// expect-none: R01
export function* pageNumbers(total: number) {
  for (let page = 1; page <= total; page += 1) yield page;
}

export const authHeaders = () => ({
  Authorization: `Bearer ${API_SECRET}`,
  "X-Payment-Key": paymentSecret,
});
