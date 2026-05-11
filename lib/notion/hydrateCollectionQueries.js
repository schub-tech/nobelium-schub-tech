import api from '@/lib/server/notion-api'
import normalizeRecordMap from './normalizeRecordMap'

function getCollectionId (block, recordMap) {
  if (block.collection_id) return block.collection_id
  if (block.format?.collection_pointer?.id) return block.format.collection_pointer.id

  const viewId = block.view_ids?.[0]
  const collectionView = viewId ? recordMap.collection_view?.[viewId]?.value : null
  return collectionView?.format?.collection_pointer?.id
}

function mergeRecordTable (target, source, key) {
  target[key] = {
    ...(target[key] || {}),
    ...(source?.[key] || {})
  }
}

export default async function hydrateCollectionQueries (recordMap = {}) {
  const collectionBlocks = Object.values(recordMap.block || {})
    .map(record => record?.value)
    .filter(block => block?.type === 'collection_view' || block?.type === 'collection_view_page')

  for (const block of collectionBlocks) {
    const collectionId = getCollectionId(block, recordMap)
    const viewIds = block.view_ids || []
    if (!collectionId || viewIds.length === 0) continue

    recordMap.collection_query = recordMap.collection_query || {}
    recordMap.collection_query[collectionId] = recordMap.collection_query[collectionId] || {}

    for (const viewId of viewIds) {
      if (recordMap.collection_query[collectionId][viewId]) continue

      const collectionView = recordMap.collection_view?.[viewId]?.value
      if (!collectionView) continue

      try {
        const collectionData = await api.getCollectionData(collectionId, viewId, collectionView)
        const extraRecordMap = normalizeRecordMap(collectionData?.recordMap)

        mergeRecordTable(recordMap, extraRecordMap, 'block')
        mergeRecordTable(recordMap, extraRecordMap, 'collection')
        mergeRecordTable(recordMap, extraRecordMap, 'collection_view')
        mergeRecordTable(recordMap, extraRecordMap, 'notion_user')
        mergeRecordTable(recordMap, extraRecordMap, 'signed_urls')

        recordMap.collection_query[collectionId][viewId] =
          collectionData?.result?.reducerResults || {}
      } catch (error) {
        console.log(`Failed to query Notion collection data for "${collectionId}".`)
      }
    }
  }

  return recordMap
}
