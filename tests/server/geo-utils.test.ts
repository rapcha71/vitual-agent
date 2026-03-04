import { describe, it, expect } from "vitest";
import { calculateDistance, isWithinRadius } from "../../server/lib/geo-utils";

describe("geo-utils", () => {
  const sanJose = { lat: 9.9281, lng: -84.0907 };
  const alajuela = { lat: 10.0159, lng: -84.2142 };

  describe("calculateDistance", () => {
    it("calcula distancia entre dos puntos", () => {
      const distance = calculateDistance(sanJose, alajuela);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(100000); // ~20km entre SJ y Alajuela
    });

    it("retorna 0 para el mismo punto", () => {
      const distance = calculateDistance(sanJose, sanJose);
      expect(distance).toBe(0);
    });
  });

  describe("isWithinRadius", () => {
    it("retorna true cuando está dentro del radio", () => {
      const near = { lat: 9.929, lng: -84.091 }; // ~200m de San José
      expect(isWithinRadius(sanJose, near, 1000)).toBe(true);
    });

    it("retorna false cuando está fuera del radio", () => {
      expect(isWithinRadius(sanJose, alajuela, 1000)).toBe(false);
    });
  });
});
