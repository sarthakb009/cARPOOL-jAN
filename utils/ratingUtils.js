export const calculateAverageRating = (reviews) => {
  if (!reviews || reviews.length === 0) return 0;
  const validRatings = reviews.filter(review => review.driverRating !== null);
  if (validRatings.length === 0) return 0;
  
  const sum = validRatings.reduce((acc, review) => acc + review.driverRating, 0);
  return (sum / validRatings.length).toFixed(1);
}; 