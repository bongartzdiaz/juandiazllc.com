/* Country presets for PropertyTaxonomy.
   Admins can apply one of these then customise from there. */

type Option = { value: string; label: string }
type Flag = { key: string; label: string }

export interface TaxonomyPreset {
  id: string
  countryLabel: string
  districts: Option[]
  propertyTypes: Option[]
  subtypes: Record<string, Option[]>
  listingTypes: Option[]
  flags: Flag[]
}

const COMMON_HOUSE_SUBTYPES: Option[] = [
  { value: 'detached_house', label: 'Detached House' },
  { value: 'semi_detached_house', label: 'Semi-Detached House' },
  { value: 'town_house', label: 'Town House' },
  { value: 'bungalow', label: 'Bungalow' },
  { value: 'villa', label: 'Villa' },
]
const COMMON_APT_SUBTYPES: Option[] = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'penthouse', label: 'Penthouse' },
  { value: 'studio', label: 'Studio' },
  { value: 'ground_floor_apartment', label: 'Ground Floor Apartment' },
  { value: 'maisonette', label: 'Maisonette' },
]
const COMMON_LAND_SUBTYPES: Option[] = [
  { value: 'land', label: 'Land' },
  { value: 'plot', label: 'Plot' },
]
const COMMON_COMMERCIAL_SUBTYPES: Option[] = [
  { value: 'office', label: 'Office' },
  { value: 'shop', label: 'Shop' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'mixed_use_property', label: 'Mixed Use Property' },
]
const DEFAULT_TYPES: Option[] = [
  { value: 'residential', label: 'Houses' },
  { value: 'apartment', label: 'Apartments' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
]
const DEFAULT_LISTING: Option[] = [
  { value: 'sale', label: 'For Sale' },
  { value: 'rent', label: 'For Rent' },
]
const DEFAULT_FLAGS: Flag[] = [
  { key: 'isBankOwned', label: 'Bank Owned Properties' },
  { key: 'isResale', label: 'Resale Properties' },
]

export const PRESETS: TaxonomyPreset[] = [
  {
    id: 'cyprus',
    countryLabel: 'Cyprus',
    districts: [
      { value: 'paphos', label: 'Paphos' },
      { value: 'limassol', label: 'Limassol' },
      { value: 'larnaca', label: 'Larnaca' },
      { value: 'nicosia', label: 'Nicosia' },
      { value: 'famagusta', label: 'Famagusta' },
    ],
    propertyTypes: DEFAULT_TYPES,
    subtypes: {
      residential: [
        { value: 'detached_house', label: 'Detached House' },
        { value: 'semi_detached_house', label: 'Semi-Detached House' },
        { value: 'link_detached_house', label: 'Link-Detached House' },
        { value: 'bungalow', label: 'Bungalow' },
        { value: 'semi_detached_bungalow', label: 'Semi-Detached Bungalow' },
        { value: 'link_detached_bungalow', label: 'Link-Detached Bungalow' },
        { value: 'town_house', label: 'Town House' },
        { value: 'end_town_house', label: 'End Town House' },
      ],
      apartment: [
        { value: 'apartment', label: 'Apartment' },
        { value: 'penthouse', label: 'Penthouse' },
        { value: 'entire_floor_apartment', label: 'Entire Floor Apartment' },
        { value: 'ground_floor_apartment', label: 'Ground Floor Apartment' },
        { value: 'maisonette', label: 'Maisonette' },
      ],
      land: COMMON_LAND_SUBTYPES,
      commercial: [
        { value: 'apartment_building', label: 'Apartment Building' },
        { value: 'bar', label: 'Bar' },
        { value: 'block_of_flats', label: 'Block Of Flats' },
        { value: 'business_park', label: 'Business Park' },
        { value: 'cafe', label: 'Café' },
        { value: 'childcare_facility', label: 'Childcare Facility' },
        { value: 'commercial_building', label: 'Commercial Building' },
        { value: 'convenience_store', label: 'Convenience Store' },
        { value: 'data_center', label: 'Data Center' },
        { value: 'distribution_warehouse', label: 'Distribution Warehouse' },
        { value: 'factory', label: 'Factory' },
        { value: 'farm', label: 'Farm' },
        { value: 'garage', label: 'Garage' },
        { value: 'guest_house', label: 'Guest House' },
        { value: 'health_care_facility', label: 'Health Care Facility' },
        { value: 'high_street_retail_property', label: 'High Street Retail Property' },
        { value: 'hotel', label: 'Hotel' },
        { value: 'hotel_apartments', label: 'Hotel Apartments' },
        { value: 'industrial_building', label: 'Industrial Building' },
        { value: 'leisure_facility', label: 'Leisure Facility' },
        { value: 'marine_property', label: 'Marine Property' },
        { value: 'mixed_use_property', label: 'Mixed Use Property' },
        { value: 'nightclub', label: 'Nightclub' },
        { value: 'office', label: 'Office' },
        { value: 'out_of_town_retail_property', label: 'Out of Town Retail Property' },
        { value: 'petrol_station', label: 'Petrol Station' },
        { value: 'pub', label: 'Pub' },
        { value: 'restaurant', label: 'Restaurant' },
        { value: 'serviced_office', label: 'Serviced Office' },
        { value: 'shop', label: 'Shop' },
        { value: 'shopping_center', label: 'Shopping Center' },
        { value: 'shopping_mall', label: 'Shopping Mall' },
        { value: 'showroom', label: 'Showroom' },
        { value: 'storage', label: 'Storage' },
        { value: 'warehouse', label: 'Warehouse' },
        { value: 'workshop', label: 'Workshop' },
      ],
    },
    listingTypes: DEFAULT_LISTING,
    flags: DEFAULT_FLAGS,
  },
  {
    id: 'netherlands',
    countryLabel: 'Netherlands',
    districts: [
      { value: 'noord_holland', label: 'Noord-Holland' },
      { value: 'zuid_holland', label: 'Zuid-Holland' },
      { value: 'utrecht', label: 'Utrecht' },
      { value: 'noord_brabant', label: 'Noord-Brabant' },
      { value: 'gelderland', label: 'Gelderland' },
      { value: 'overijssel', label: 'Overijssel' },
      { value: 'flevoland', label: 'Flevoland' },
      { value: 'friesland', label: 'Friesland' },
      { value: 'groningen', label: 'Groningen' },
      { value: 'drenthe', label: 'Drenthe' },
      { value: 'zeeland', label: 'Zeeland' },
      { value: 'limburg', label: 'Limburg' },
    ],
    propertyTypes: DEFAULT_TYPES,
    subtypes: {
      residential: [
        { value: 'eengezinswoning', label: 'Eengezinswoning' },
        { value: 'tussenwoning', label: 'Tussenwoning' },
        { value: 'hoekwoning', label: 'Hoekwoning' },
        { value: 'vrijstaande_woning', label: 'Vrijstaande woning' },
        { value: 'twee_onder_een_kap', label: '2-onder-1-kapwoning' },
        { value: 'bungalow', label: 'Bungalow' },
        { value: 'villa', label: 'Villa' },
        { value: 'herenhuis', label: 'Herenhuis' },
      ],
      apartment: [
        { value: 'appartement', label: 'Appartement' },
        { value: 'bovenwoning', label: 'Bovenwoning' },
        { value: 'benedenwoning', label: 'Benedenwoning' },
        { value: 'penthouse', label: 'Penthouse' },
        { value: 'maisonnette', label: 'Maisonnette' },
        { value: 'studio', label: 'Studio' },
      ],
      land: [
        { value: 'bouwgrond', label: 'Bouwgrond' },
        { value: 'landbouwgrond', label: 'Landbouwgrond' },
      ],
      commercial: [
        { value: 'kantoor', label: 'Kantoor' },
        { value: 'winkel', label: 'Winkel' },
        { value: 'horeca', label: 'Horeca' },
        { value: 'hotel', label: 'Hotel' },
        { value: 'bedrijfspand', label: 'Bedrijfspand' },
        { value: 'loods', label: 'Loods' },
      ],
    },
    listingTypes: [
      { value: 'sale', label: 'Te Koop' },
      { value: 'rent', label: 'Te Huur' },
    ],
    flags: [
      { key: 'isBankOwned', label: 'Executieverkoop' },
      { key: 'isResale', label: 'Bestaande bouw' },
    ],
  },
  {
    id: 'uk',
    countryLabel: 'United Kingdom',
    districts: [
      { value: 'london', label: 'London' },
      { value: 'south_east', label: 'South East' },
      { value: 'south_west', label: 'South West' },
      { value: 'east_of_england', label: 'East of England' },
      { value: 'east_midlands', label: 'East Midlands' },
      { value: 'west_midlands', label: 'West Midlands' },
      { value: 'yorkshire_and_the_humber', label: 'Yorkshire and the Humber' },
      { value: 'north_west', label: 'North West' },
      { value: 'north_east', label: 'North East' },
      { value: 'scotland', label: 'Scotland' },
      { value: 'wales', label: 'Wales' },
      { value: 'northern_ireland', label: 'Northern Ireland' },
    ],
    propertyTypes: DEFAULT_TYPES,
    subtypes: {
      residential: COMMON_HOUSE_SUBTYPES,
      apartment: [...COMMON_APT_SUBTYPES, { value: 'flat', label: 'Flat' }],
      land: COMMON_LAND_SUBTYPES,
      commercial: COMMON_COMMERCIAL_SUBTYPES,
    },
    listingTypes: DEFAULT_LISTING,
    flags: [
      { key: 'isBankOwned', label: 'Repossessed' },
      { key: 'isResale', label: 'Resale' },
    ],
  },
  {
    id: 'spain',
    countryLabel: 'Spain',
    districts: [
      { value: 'andalucia', label: 'Andalucía' },
      { value: 'cataluna', label: 'Cataluña' },
      { value: 'madrid', label: 'Madrid' },
      { value: 'valencia', label: 'Valencia' },
      { value: 'balearic_islands', label: 'Balearic Islands' },
      { value: 'canary_islands', label: 'Canary Islands' },
      { value: 'murcia', label: 'Murcia' },
      { value: 'galicia', label: 'Galicia' },
    ],
    propertyTypes: DEFAULT_TYPES,
    subtypes: {
      residential: [...COMMON_HOUSE_SUBTYPES, { value: 'finca', label: 'Finca' }, { value: 'country_house', label: 'Country House' }],
      apartment: COMMON_APT_SUBTYPES,
      land: COMMON_LAND_SUBTYPES,
      commercial: COMMON_COMMERCIAL_SUBTYPES,
    },
    listingTypes: [
      { value: 'sale', label: 'En Venta' },
      { value: 'rent', label: 'En Alquiler' },
    ],
    flags: [
      { key: 'isBankOwned', label: 'Bank Repossession' },
      { key: 'isResale', label: 'Resale' },
    ],
  },
  {
    id: 'greece',
    countryLabel: 'Greece',
    districts: [
      { value: 'attica', label: 'Attica' },
      { value: 'central_macedonia', label: 'Central Macedonia' },
      { value: 'thessaly', label: 'Thessaly' },
      { value: 'crete', label: 'Crete' },
      { value: 'peloponnese', label: 'Peloponnese' },
      { value: 'ionian_islands', label: 'Ionian Islands' },
      { value: 'south_aegean', label: 'South Aegean' },
      { value: 'north_aegean', label: 'North Aegean' },
    ],
    propertyTypes: DEFAULT_TYPES,
    subtypes: {
      residential: COMMON_HOUSE_SUBTYPES,
      apartment: COMMON_APT_SUBTYPES,
      land: COMMON_LAND_SUBTYPES,
      commercial: COMMON_COMMERCIAL_SUBTYPES,
    },
    listingTypes: DEFAULT_LISTING,
    flags: DEFAULT_FLAGS,
  },
  {
    id: 'generic',
    countryLabel: 'Generic',
    districts: [],
    propertyTypes: DEFAULT_TYPES,
    subtypes: {
      residential: COMMON_HOUSE_SUBTYPES,
      apartment: COMMON_APT_SUBTYPES,
      land: COMMON_LAND_SUBTYPES,
      commercial: COMMON_COMMERCIAL_SUBTYPES,
    },
    listingTypes: DEFAULT_LISTING,
    flags: DEFAULT_FLAGS,
  },
]
