export function getFlagEmoji(location: string): string {
    const cleanLocation = location.trim().toLowerCase();
  
    for (const country of regionList) {
      const match = country.region.find(region =>
        cleanLocation.includes(region.name.toLowerCase())
      );
      if (match) {
        return getEmojiFromCountryCode(country.countryCode);
      }
    }
  
    return "";
  }
  
  // Convertit un code pays ISO 3166-1 alpha-2 vers un emoji 🇫🇷
  export function getEmojiFromCountryCode(code: string): string {
    return code
      .toUpperCase()
      .replace(/./g, char =>
        String.fromCodePoint(127397 + char.charCodeAt(0))
      );
  }
  
  // Exemple de liste (France uniquement ici, à étendre avec d'autres pays européens)
  export const regionList = [
    {
      countryCode: "FR",
      countryName: "France",
      region: [
        { name: "Auvergne-Rhône-Alpes", code: "ARA" },
        { name: "Bourgogne-Franche-Comté", code: "BFC" },
        { name: "Bretagne", code: "BRE" },
        { name: "Centre-Val de Loire", code: "CVL" },
        { name: "Corse", code: "COR" },
        { name: "Grand Est", code: "GES" },
        { name: "Hauts-de-France", code: "HDF" },
        { name: "Île-de-France", code: "IDF" },
        { name: "Normandie", code: "NOR" },
        { name: "Nouvelle-Aquitaine", code: "NAQ" },
        { name: "Occitanie", code: "OCC" },
        { name: "Pays de la Loire", code: "PDL" },
        { name: "Provence-Alpes-Côte d'Azur", code: "PAC" },
      ],
    },
  ];
  