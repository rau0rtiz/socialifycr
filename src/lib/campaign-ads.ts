export function campaignAds<T extends { campaign_id: string }>(ads: T[], campaignId: string): T[] {
  return ads.filter((ad) => ad.campaign_id === campaignId);
}