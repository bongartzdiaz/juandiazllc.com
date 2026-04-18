/* Cyprus property classification — based on DEUS Amenities Filters spec.
   Source reference: buysellcyprus.com taxonomy. */

export const CYPRUS_DISTRICTS = [
  { value: '', label: 'All Cyprus' },
  { value: 'paphos', label: 'Paphos' },
  { value: 'limassol', label: 'Limassol' },
  { value: 'larnaca', label: 'Larnaca' },
  { value: 'nicosia', label: 'Nicosia' },
  { value: 'famagusta', label: 'Famagusta' },
] as const

export const LISTING_TYPES = [
  { value: 'sale', label: 'For Sale' },
  { value: 'rent', label: 'For Rent' },
] as const

export const PROPERTY_TYPES = [
  { value: 'residential', label: 'Houses' },
  { value: 'apartment', label: 'Apartments' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
] as const

/* Subtypes keyed by top-level type */
export const PROPERTY_SUBTYPES: Record<string, Array<{ value: string; label: string }>> = {
  residential: [
    { value: '', label: 'All Subtypes' },
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
    { value: '', label: 'All Subtypes' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'penthouse', label: 'Penthouse' },
    { value: 'entire_floor_apartment', label: 'Entire Floor Apartment' },
    { value: 'ground_floor_apartment', label: 'Ground Floor Apartment' },
    { value: 'maisonette', label: 'Maisonette' },
  ],
  land: [
    { value: '', label: 'All Subtypes' },
    { value: 'land', label: 'Land' },
    { value: 'plot', label: 'Plot' },
  ],
  commercial: [
    { value: '', label: 'All Subtypes' },
    { value: 'apartment_building', label: 'Apartment Building' },
    { value: 'bar', label: 'Bar' },
    { value: 'block_of_flats', label: 'Block Of Flats' },
    { value: 'business_park', label: 'Business Park' },
    { value: 'cafe', label: 'Café' },
    { value: 'childcare_facility', label: 'Childcare Facility' },
    { value: 'commercial_building', label: 'Commercial Building' },
    { value: 'communal_development', label: 'Communal Development' },
    { value: 'convenience_store', label: 'Convenience Store' },
    { value: 'data_center', label: 'Data Center' },
    { value: 'distribution_warehouse', label: 'Distribution Warehouse' },
    { value: 'factory', label: 'Factory' },
    { value: 'farm', label: 'Farm' },
    { value: 'garage', label: 'Garage' },
    { value: 'guest_house', label: 'Guest House' },
    { value: 'hair_dresser_barber_shop', label: 'Hair Dresser / Barber Shop' },
    { value: 'health_care_facility', label: 'Health Care Facility' },
    { value: 'heavy_industrial', label: 'Heavy Industrial' },
    { value: 'high_street_retail_property', label: 'High Street Retail Property' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'hotel_apartments', label: 'Hotel Apartments' },
    { value: 'industrial_building', label: 'Industrial Building' },
    { value: 'industrial_development', label: 'Industrial Development' },
    { value: 'industrial_park', label: 'Industrial Park' },
    { value: 'leisure_facility', label: 'Leisure Facility' },
    { value: 'marine_property', label: 'Marine Property' },
    { value: 'mill', label: 'Mill' },
    { value: 'mixed_use_property', label: 'Mixed Use Property' },
    { value: 'nightclub', label: 'Nightclub' },
    { value: 'office', label: 'Office' },
    { value: 'out_of_town_retail_property', label: 'Out of Town Retail Property' },
    { value: 'petrol_station', label: 'Petrol Station' },
    { value: 'place_of_worship', label: 'Place of Worship' },
    { value: 'post_office', label: 'Post Office' },
    { value: 'pub', label: 'Pub' },
    { value: 'research_and_development_center', label: 'Research and Development Center' },
    { value: 'residential_development', label: 'Residential Development' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'science_park', label: 'Science Park' },
    { value: 'serviced_office', label: 'Serviced Office' },
    { value: 'shop', label: 'Shop' },
    { value: 'shopping_center', label: 'Shopping Center' },
    { value: 'shopping_mall', label: 'Shopping Mall' },
    { value: 'showroom', label: 'Showroom' },
    { value: 'storage', label: 'Storage' },
    { value: 'trade_counter', label: 'Trade Counter' },
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'workshop', label: 'Workshop' },
  ],
}

export const SUBTYPE_LABEL: Record<string, string> = Object.values(PROPERTY_SUBTYPES)
  .flat()
  .reduce((acc, s) => { if (s.value) acc[s.value] = s.label; return acc }, {} as Record<string, string>)

export const DISTRICT_LABEL: Record<string, string> = CYPRUS_DISTRICTS
  .reduce((acc, d) => { if (d.value) acc[d.value] = d.label; return acc }, {} as Record<string, string>)
