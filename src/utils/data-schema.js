import { z } from "zod";
import { SpatialEntity } from "./spatial-schema.js";

export const Dataset = z.object({
  /** id of the Dataset item */
  id: z.string().optional(),
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
  id: z.string(),
  /** label of the Donor */
  label: z.string(),
  /** descripton of the Donor */
  description: z.string().optional(),
  /** link of the Donor */
  link: z.string(),
  /** Age of the Donor */
  age: z.number().optional(),
  /** Sex of the Donor */
  sex: z.enum(['Male', 'Female']).optional(),
  /** BMI of the Donor */
  bmi: z.number().optional(),
  /** An array of Block */
  blocks: Block.array().min(1),
});

export const Provider = z.object({
  /** Provider Name */
  provider_name: z.string(),
  /** Provider UUID */
  provider_uuid: z.string().optional(),
  /** Consortium Name */
  consortium_name: z.string().optional(),
  /** Defaults: thumbnail technology */
  thumbnail: z.string(),
  default_dataset_technology: z.string().optional(),
  /** An array of Donor */
  donors: Donor.array().min(1),
});

export const Providers = Provider.array();
