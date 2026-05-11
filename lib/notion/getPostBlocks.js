import api from '@/lib/server/notion-api'
import hydrateCollectionQueries from './hydrateCollectionQueries'
import normalizeRecordMap from './normalizeRecordMap'

export async function getPostBlocks (id) {
  const pageBlock = await api.getPage(id)
  return hydrateCollectionQueries(normalizeRecordMap(pageBlock))
}
