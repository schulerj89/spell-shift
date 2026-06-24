export const heroAccessoryManifest = {
  id: "hero-accessories",
  basePath: "/assets/characters/hero/Accessories",
  accessories: [
    {
      id: "starter-shirt",
      label: "Starter Shirt",
      type: "clothing",
      url: "/assets/characters/hero/Accessories/Starter_Shirt.glb",
      fit: {
        targetHeight: 0.72,
        center: [0, 1.08, 0.02]
      }
    },
    {
      id: "starter-pants",
      label: "Starter Pants",
      type: "clothing",
      url: "/assets/characters/hero/Accessories/Starter_Pants.glb",
      fit: {
        targetHeight: 0.82,
        center: [0, 0.58, 0]
      }
    },
    {
      id: "starter-shoes",
      label: "Starter Shoes",
      type: "mirrored-pair",
      url: "/assets/characters/hero/Accessories/Starter_Shoe.glb",
      fit: {
        targetHeight: 0.22,
        center: [0, 0.12, 0.04],
        pairOffsetX: 0.17
      }
    }
  ]
};
