import { clientConfig } from '@/lib/server/config'
import { createHash } from 'crypto'

import Container from '@/components/Container'
import Post from '@/components/Post'
import { getAllPosts, getPostBlocks } from '@/lib/notion'
import { useConfig } from '@/lib/config'

export async function getStaticProps () {
  const posts = await getAllPosts({ includePages: true })
  const homePage = posts.find(p => p.slug === 'home')

  if (!homePage) {
    return { notFound: true }
  }

  const blockMap = await getPostBlocks(homePage.id)
  const emailHash = createHash('md5')
    .update(clientConfig.email || '')
    .digest('hex')
    .trim()
    .toLowerCase()

  return {
    props: { post: homePage, blockMap, emailHash },
    revalidate: 1
  }
}

export default function Home ({ post, blockMap, emailHash }) {
  const { title, description } = useConfig()

  return (
    <Container layout="blog" title={title} description={description} showHeader={false}>
      <Post
        post={post}
        blockMap={blockMap}
        emailHash={emailHash}
      />
    </Container>
  )
}
