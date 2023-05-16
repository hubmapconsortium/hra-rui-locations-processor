import { z } from 'zod';
import { SpatialEntity } from './spatial-schema.js';

export const Dataset = z.object({
  /** id of the Dataset item */
  id: z.string().optional(),
  /** type of dataset */
  '@type': z.string().optional(),
  /** label of the Dataset item */
  label: z.string().optional(),
  /** description of the Dataset item */
  description: z.string().optional(),
  /** link of the Dataset item */
  link: z.string().optional(),
  /** technology of the Dataset item */
  technology: z.string().optional(),
  /** thumbnail of the Dataset item */
  thumbnail: z.string().optional(),
});

export const Section = z.object({
  /** id of the Section item */
  id: z.string().optional(),
  /** type of section */
  '@type': z.string().optional(),
  /** sample type of section */
  sample_type: z.literal('Tissue Section').optional(),
  /** label of the Section item */
  label: z.string().optional(),
  /** description of the Section item */
  description: z.string().optional(),
  /** link of the Section item */
  link: z.string().optional(),
  /** Section number of the Section item */
  section_number: z.number().optional(),
  /** An array of Dataset */
  datasets: Dataset.array().optional(),
});

export const Block = z.object({
  /** id of the Section item */
  id: z.string().optional(),
  /** type of section */
  '@type': z.string().optional(),
  /** sample type of block */
  sample_type: z.literal('Tissue Block').optional(),
  /** RUI Location of Section item */
  rui_location: z.string().or(SpatialEntity),
  /** label of the Section item */
  label: z.string().optional(),
  /** description of the Section item */
  description: z.string().optional(),
  /** link of the Section item */
  link: z.string().optional(),
  /** Section Count */
  section_count: z.number().optional(),
  /** Section size of the Section item*/
  section_size: z.number().optional(),
  /** section unit of the Section item*/
  section_unit: z.string().optional(),
  /** An array of Section */
  sections: Section.array().optional(),
  /** An array of Dataset */
  datasets: Dataset.array().optional(),
});

export const Donor = z.object({
  /** id of the Donor */
  id: z.string().optional(),
  /** type of donor */
  '@type': z.string().optional(),
  /** label of the Donor */
  label: z.string().optional(),
  /** descripton of the Donor */
  description: z.string().optional(),
  /** link of the Donor */
  link: z.string().optional(),
  /** Age of the Donor */
  age: z.number().optional(),
  /** Sex of the Donor */
  sex: z.enum(['Male', 'Female']),
  /** BMI of the Donor */
  bmi: z.number().optional(),
  /** An array of Block */
  samples: Block.array().min(1),
});

export const Default = z.object({
  /** default id */
  id: z.string(),
  /** default link */
  link: z.string(),
  /** default thumbnail */
  thumbnail: z.string().optional(),
});

export const Provider = z.object({
  /** type of donor */
  '@type': z.string().optional(),
  /** Provider Name */
  provider_name: z.string(),
  /**description */
  description: z.string().optional(),
  /** Provider UUID */
  provider_uuid: z.string(),
  /** Consortium Name */
  consortium_name: z.string(),
  /** Default Thumbnail */
  default_dataset_technology: z.string().optional(),
  /** An array of Donor */
  donors: Donor.array().min(1),
  /** Default id, link, and thumbnail if the Provider doesn't have it */
  defaults: Default.optional(),
});

export const Providers = Provider.array();
