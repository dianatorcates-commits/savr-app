export interface VisitReview {
  id?: string;
  userId: string;
  branchId: string;
  restaurantId?: string;
  rating: number;
  likedIt: boolean;
  wouldReturn: boolean;
  serviceRating: number;
  foodRating: number;
  createdAt: number;
}
