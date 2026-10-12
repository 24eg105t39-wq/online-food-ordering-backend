import { Request, Response, NextFunction } from 'express';
import { store } from '../services/store';

export async function getRestaurants(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { latitude, longitude, radiusKm, search, isVeg } = req.query;

    const lat = latitude ? parseFloat(latitude as string) : undefined;
    const lng = longitude ? parseFloat(longitude as string) : undefined;
    const radius = radiusKm ? parseFloat(radiusKm as string) : undefined;
    const isVegBool = isVeg !== undefined ? isVeg === 'true' : undefined;

    const restaurants = store.getRestaurants({
      latitude: lat,
      longitude: lng,
      radiusKm: radius,
      search: search as string,
      isVeg: isVegBool,
    });

    res.status(200).json({
      success: true,
      count: restaurants.length,
      userLocation: lat && lng ? { latitude: lat, longitude: lng } : null,
      data: restaurants,
    });
  } catch (err) {
    next(err);
  }
}

export async function getRestaurantById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.query;

    const lat = latitude ? parseFloat(latitude as string) : undefined;
    const lng = longitude ? parseFloat(longitude as string) : undefined;

    const restaurant = store.getRestaurantById(id, lat, lng);
    if (!restaurant) {
      res.status(404).json({
        success: false,
        message: 'Restaurant not found',
      });
      return;
    }

    const menu = store.getFoods({ restaurantId: restaurant.id });

    res.status(200).json({
      success: true,
      data: {
        ...restaurant,
        menu,
      },
    });
  } catch (err) {
    next(err);
  }
}
