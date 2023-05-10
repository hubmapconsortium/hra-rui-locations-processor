import { z } from 'zod';

export const SpatialPlacementCommon = z.object({
  /** JSON-LD context */
  '@context': z.string().optional(),
  /** Identifier */
  '@id': z.string(),
  /** Type name */
  '@type': z.literal('SpatialPlacement'),

  /** Date placement was made */
  placement_date: z.string(),
  // placement_date: z.coerce.date(),
  /** Scaling in x-dimension */
  x_scaling: z.number(),
  /** Scaling in y-dimension */
  y_scaling: z.number(),
  /** Scaling in z-dimension */
  z_scaling: z.number(),
  /** Units scaling is expressed in */
  scaling_units: z.string(),
  /** Rotation in x-dimension */
  x_rotation: z.number(),
  /** Rotation in y-dimension */
  y_rotation: z.number(),
  /** Rotation in z-dimension */
  z_rotation: z.number(),
  /** Rotation in w-dimension */
  w_rotation: z.number().optional(),
  /** Order rotations should be applied in */
  rotation_order: z.string().optional(),
  /** Units rotation is expressed in */
  rotation_units: z.string(),

  /** Translation in x-dimension */
  x_translation: z.number(),
  /** Translation in y-dimension */
  y_translation: z.number(),
  /** Translation in z-dimension */
  z_translation: z.number(),
  /** Units translation is expressed in */
  translation_units: z.string(),
});

export const temp = z.object({
  /** Identifier */
  '@id': z.string(),
  /** Type name */
  '@type': z.literal('SpatialEntity'),
  /**Context label */
  '@context': z.string(),
  /** Entity label */
  label: z.string().optional(),
  /** Entity Comment */
  comment: z.string().optional(),
  /** Creator */
  creator: z.string().optional(),
  /** Creator first name*/
  creator_first_name: z.string().optional(),
  /** Creator last name*/
  creator_last_name: z.string().optional(),
  /** Creator identifier */
  creator_orcid: z.string().optional(),
  /** Creation date */
  creation_date: z.string().optional(),
  /** Annotations (a set of IRIs) */
  ccf_annotations: z.array(z.string()).optional(),

  /** X-dimension */
  x_dimension: z.number().optional(),
  /** Y-dimension */
  y_dimension: z.number().optional(),
  /** Z-dimension */
  z_dimension: z.number().optional(),
  /** Units dimensions are in */
  dimension_units: z.string().optional(),
});

export const SpatialPlacement = SpatialPlacementCommon.extend({
  /** Source entity */
  source: z.string().or(temp).optional(),
  /** Target entity */
  target: z.string().or(temp),
});

export const SpatialEntity = temp.extend({
  placement: SpatialPlacement,
});
