const DEFAULT_ENDPOINT = 'https://apps.humanatlas.io/api/v1/collisions';

export async function getCollisions(ruiLocation, endpoint = DEFAULT_ENDPOINT) {
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ruiLocation),
  });
  if (resp.ok) {
    return await resp.json();
  } else {
    return [];
  }
}

export async function addMeshBasedCollisions(ruiLocation, endpoint = DEFAULT_ENDPOINT) {
  const collisions = await getCollisions(ruiLocation, endpoint);
  const annotations = [...(ruiLocation.ccf_annotations ?? []), ...collisions.map((c) => c.representation_of)];
  ruiLocation.ccf_annotations = Array.from(new Set(annotations));
}

export async function addMeshBasedCollisionsToAll(jsonld, endpoint = DEFAULT_ENDPOINT) {
  for (const donor of jsonld['@graph']) {
    for (const block of donor.samples) {
      if (block.rui_location) {
        await addMeshBasedCollisions(block.rui_location);
      }
    }
  }
}
