import { writeFile } from "node:fs/promises";

const apiKey = process.env.GOOGLE_PLACES_API_KEY;
if (!apiKey) throw new Error("Falta GOOGLE_PLACES_API_KEY");

const searchResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "X-Goog-Api-Key": apiKey,
    "X-Goog-FieldMask": "places.id"
  },
  body: JSON.stringify({
    textQuery: "Date el Gusto Fortín Mercedes 138 Sierra de la Ventana Buenos Aires",
    languageCode: "es"
  })
});

if (!searchResponse.ok) throw new Error(`Google Text Search respondió ${searchResponse.status}: ${await searchResponse.text()}`);
const search = await searchResponse.json();
const placeId = search.places?.[0]?.id;
if (!placeId) throw new Error("Google no encontró Date el Gusto");

const detailResponse = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=es`, {
  headers: {
    "X-Goog-Api-Key": apiKey,
    "X-Goog-FieldMask": "id,rating,userRatingCount,reviews,googleMapsUri"
  }
});

if (!detailResponse.ok) throw new Error(`Google Place Details respondió ${detailResponse.status}: ${await detailResponse.text()}`);
const place = await detailResponse.json();
const reviews = (place.reviews ?? [])
  .filter(review => Number(review.rating) >= 4 && review.text?.text?.trim())
  .slice(0, 3)
  .map(review => ({
    author: review.authorAttribution?.displayName?.trim() || "Cliente de Google",
    rating: Number(review.rating),
    text: review.text.text.trim(),
    relativeTime: review.relativePublishTimeDescription ?? null
  }));

if (!reviews.length) throw new Error("Google no devolvió reseñas positivas con texto");

const output = {
  updatedAt: new Date().toISOString(),
  placeId,
  placeRating: Number(place.rating) || null,
  reviewCount: Number(place.userRatingCount) || null,
  googleMapsUri: place.googleMapsUri || null,
  reviews
};

await writeFile(new URL("../reviews.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Guardadas ${reviews.length} reseñas positivas de Google.`);
