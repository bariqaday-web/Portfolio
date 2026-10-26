export function assertDifferentParties(customerId: string, merchantId: string) {
  if (customerId === merchantId) {
    throw new Error("لا يمكنك حجز منتجات متجرك أو مراسلة نفسك");
  }
}
