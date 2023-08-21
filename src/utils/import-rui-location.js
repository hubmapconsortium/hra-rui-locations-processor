import { z } from 'zod';

//Importing from List and applying filters

export const Filter = z.object({
  ids: z.array(z.string()),
});

export const ImportMultiLocation = z.object({
  imports: z.array(z.string()),
  filter: Filter.optional(),
});

// Importing from CSV

export const FieldMappingSchema = z
  .object({
    uniqueId: z.string(),
    endpoint: z.string(),
    paperId: z.string(),
    datasetId: z.string(),
    sampleId: z.string(),
    ruiLocationId: z.string(),
    donorId: z.string(),
    publication: z.string()
  })
  .partial();

export const DefaultsSchema = z.object({
  baseIri: z.string(),
});

export const ImportFromCSV = z.object({
  import_from_csv: z.string(),
  fields: FieldMappingSchema,
  defaults: DefaultsSchema.optional(),
});
