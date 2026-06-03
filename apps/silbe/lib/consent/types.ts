// Consent state shape per Shopify Customer Privacy API.
//
// Categories mirror Shopify's API contract; sale_of_data is rarely user-facing
// in DACH but is supported in the payload so the API call is well-formed.
// null = no decision yet (banner should show). Object = decision recorded.

export type ConsentCategories = {
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  sale_of_data: boolean;
};

export type VisitorConsent = ConsentCategories | null;
