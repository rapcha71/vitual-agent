import { describe, it, expect } from "vitest";
import {
  insertUserSchema,
  insertPropertySchema,
  insertMessageSchema,
} from "@shared/schema";

describe("insertUserSchema", () => {
  it("valida usuario correcto", () => {
    const valid = {
      username: "test@email.com",
      password: "password123",
      fullName: "Juan Pérez",
      mobile: "88881234",
      nickname: "juan",
    };
    expect(() => insertUserSchema.parse(valid)).not.toThrow();
  });

  it("rechaza sin username", () => {
    const invalid = { password: "password123" };
    expect(() => insertUserSchema.parse(invalid)).toThrow();
  });

  it("rechaza sin password", () => {
    const invalid = { username: "test@email.com" };
    expect(() => insertUserSchema.parse(invalid)).toThrow();
  });
});

describe("insertPropertySchema", () => {
  it("valida propiedad correcta", () => {
    const valid = {
      propertyType: "house",
      location: { lat: 9.93, lng: -84.09 },
      propertyId: "TEST-001",
      images: { sign: "data:image/png;base64,xxx", property: "data:image/png;base64,yyy" },
    };
    expect(() => insertPropertySchema.parse(valid)).not.toThrow();
  });

  it("rechaza propertyType inválido", () => {
    const invalid = {
      propertyType: "invalid",
      location: { lat: 9.93, lng: -84.09 },
      propertyId: "TEST-001",
      images: {},
    };
    expect(() => insertPropertySchema.parse(invalid)).toThrow();
  });

  it("rechaza location inválida", () => {
    const invalid = {
      propertyType: "house",
      location: { lat: "invalid", lng: -84.09 },
      propertyId: "TEST-001",
      images: {},
    };
    expect(() => insertPropertySchema.parse(invalid)).toThrow();
  });
});

describe("insertMessageSchema", () => {
  it("valida mensaje correcto", () => {
    const valid = { content: "Hola, este es un mensaje" };
    expect(() => insertMessageSchema.parse(valid)).not.toThrow();
  });

  it("rechaza contenido vacío", () => {
    const invalid = { content: "" };
    expect(() => insertMessageSchema.parse(invalid)).toThrow();
  });
});
