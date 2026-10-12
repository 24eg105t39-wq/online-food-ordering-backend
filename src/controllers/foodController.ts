import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { store } from '../services/store';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getFoods(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { category, search, isVeg, sort, minPrice, maxPrice } = req.query;

    const foods = store.getFoods({
      category: category as string,
      search: search as string,
      isVeg: isVeg !== undefined ? isVeg === 'true' : undefined,
      sort: sort as any,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      isAvailable: true,
    });

    res.status(200).json({
      success: true,
      count: foods.length,
      data: foods,
    });
  } catch (err) {
    next(err);
  }
}

export async function getFoodById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const food = store.getFoodById(id);

    if (!food) {
      res.status(404).json({
        success: false,
        message: 'Food item not found',
      });
      return;
    }

    const reviews = store.getReviewsForFood(id);
    const related = store
      .getFoods({ category: food.categoryId })
      .filter((f) => f.id !== food.id)
      .slice(0, 4);

    let isWishlisted = false;
    if (req.user) {
      isWishlisted = store.isWishlisted(req.user.id, food.id);
    }

    res.status(200).json({
      success: true,
      data: {
        ...food,
        reviews,
        related,
        isWishlisted,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getCategories(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const categories = store.getAllCategories();
    const categoriesWithCount = categories.map((cat) => {
      const items = store.getFoods({ category: cat.id });
      return {
        ...cat,
        itemCount: items.length,
      };
    });

    res.status(200).json({
      success: true,
      count: categoriesWithCount.length,
      data: categoriesWithCount,
    });
  } catch (err) {
    next(err);
  }
}

export const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(3, 'Review comment must be at least 3 characters'),
});

export async function addFoodReview(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Login required to post review' });
      return;
    }

    const { id } = req.params;
    const food = store.getFoodById(id);
    if (!food) {
      res.status(404).json({ success: false, message: 'Food item not found' });
      return;
    }

    const { rating, comment } = req.body;
    const review = store.addReview(id, req.user.id, req.user.name, rating, comment);

    // Update food rating
    const allReviews = store.getReviewsForFood(id);
    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    store.updateFood(id, {
      rating: Math.round(avgRating * 10) / 10,
      reviewsCount: allReviews.length,
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for your review!',
      data: review,
    });
  } catch (err) {
    next(err);
  }
}
