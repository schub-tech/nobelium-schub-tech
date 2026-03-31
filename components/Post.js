import { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import Image from 'next/image'
import cn from 'classnames'
import { useConfig } from '@/lib/config'
import useTheme from '@/lib/theme'
import FormattedDate from '@/components/FormattedDate'
import TagItem from '@/components/TagItem'
import NotionRenderer from '@/components/NotionRenderer'
import TableOfContents from '@/components/TableOfContents'

/**
 * A post renderer
 *
 * @param {PostProps} props
 *
 * @typedef {object} PostProps
 * @prop {object}   post       - Post metadata
 * @prop {object}   blockMap   - Post block data
 * @prop {string}   emailHash  - Author email hash (for Gravatar)
 * @prop {boolean} [fullWidth] - Whether in full-width mode
 */
export default function Post (props) {
  const BLOG = useConfig()
  const { post, blockMap, emailHash, fullWidth = false } = props
  const { dark } = useTheme()
  const notionRootRef = useRef(null)
  const isPage = post.type?.[0] === 'Page'

  const normalizeExternalUrl = (value = '') => {
    const raw = value.trim()
    if (!raw) return ''
    if (/^https?:\/\//i.test(raw)) return raw
    if (raw.startsWith('//')) return `https:${raw}`
    return `https://${raw}`
  }

  const getInitials = (name = '') => {
    const words = name.trim().split(/\s+/).filter(Boolean)
    if (!words.length) return '?'
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
    return `${words[0][0]}${words[1][0]}`.toUpperCase()
  }

  // About page: group residents into a grid
  useEffect(() => {
    if (post.slug !== 'about') return

    const root = notionRootRef.current
    if (!root) return

    const notionPage = root.querySelector('.notion-page')
    if (!notionPage || notionPage.querySelector('.about-residents-grid')) return

    const residentsHeading = Array.from(notionPage.querySelectorAll('h3.notion-h2'))
      .find(node => node.textContent?.trim() === 'Residents & Alumni')
    if (!residentsHeading) return

    const grid = document.createElement('div')
    grid.className = 'about-residents-grid'

    let cursor = residentsHeading.nextElementSibling
    while (cursor) {
      const nameNode = cursor
      const imageNode = nameNode.nextElementSibling

      if (
        nameNode?.tagName !== 'H4' ||
        !nameNode.classList.contains('notion-h3') ||
        imageNode?.tagName !== 'FIGURE' ||
        !imageNode.classList.contains('notion-asset-wrapper-image')
      ) {
        break
      }

      const nextCursor = imageNode.nextElementSibling
      const card = document.createElement('div')
      card.className = 'about-resident-card'
      card.appendChild(nameNode)
      card.appendChild(imageNode)
      grid.appendChild(card)
      cursor = nextCursor
    }

    if (grid.children.length > 0) {
      residentsHeading.insertAdjacentElement('afterend', grid)
    }
  }, [post.slug])

  // Home page: group speakers into a grid
  useEffect(() => {
    if (post.slug !== 'home') return

    const root = notionRootRef.current
    if (!root) return

    const notionPage = root.querySelector('.notion-page')
    if (!notionPage || notionPage.querySelector('.home-speakers-grid')) return

    const speakersHeading = Array.from(notionPage.querySelectorAll('h3.notion-h2'))
      .find(node => node.textContent?.trim() === 'Guest Speakers')
    if (!speakersHeading) return

    const grid = document.createElement('div')
    grid.className = 'home-speakers-grid'

    // Find the intro text after the heading (skip it)
    let cursor = speakersHeading.nextElementSibling
    if (cursor && cursor.classList.contains('notion-text')) {
      cursor = cursor.nextElementSibling
    }

    while (cursor) {
      const nameNode = cursor
      // Speaker cards: H3 (name), then text (title), then image
      if (
        nameNode?.tagName !== 'H4' ||
        !nameNode.classList.contains('notion-h3')
      ) {
        break
      }

      const card = document.createElement('div')
      card.className = 'home-speaker-card'
      let nextCursor = nameNode.nextElementSibling

      card.appendChild(nameNode)

      // Grab the subtitle text if present
      if (nextCursor && nextCursor.classList.contains('notion-text')) {
        const afterText = nextCursor.nextElementSibling
        card.appendChild(nextCursor)
        nextCursor = afterText
      }

      // Grab the image if present
      if (nextCursor && nextCursor.tagName === 'FIGURE' && nextCursor.classList.contains('notion-asset-wrapper-image')) {
        const afterImage = nextCursor.nextElementSibling
        card.appendChild(nextCursor)
        nextCursor = afterImage
      }

      grid.appendChild(card)
      cursor = nextCursor
    }

    if (grid.children.length > 0) {
      speakersHeading.insertAdjacentElement('afterend', grid)
    }
  }, [post.slug])

  // Convert ventures table to a 5-column logo grid
  useEffect(() => {
    const root = notionRootRef.current
    if (!root) return

    const notionPage = root.querySelector('.notion-page')
    if (!notionPage) return

    const transformVenturesTables = () => {
      const tables = Array.from(notionPage.querySelectorAll('.notion-table'))
      tables.forEach(table => {
        if (table.dataset.venturesGrid === 'true') return

        const tableView = table.querySelector('.notion-table-view')
        const headerCells = tableView
          ? Array.from(tableView.querySelectorAll('.notion-table-header .notion-table-view-header-cell-inner'))
          : []
        if (!headerCells.length) return

        const headers = headerCells.map(cell => cell.textContent?.trim().toLowerCase() || '')
        const companyIndex = headers.findIndex(text => text.includes('company'))
        const supportIndex = headers.findIndex(text => text.includes('support'))
        const websiteIndex = headers.findIndex(text => text.includes('website'))
        const logoIndex = headers.findIndex(text => text.includes('logo'))

        // Guard: only transform the ventures-like table schema
        if (companyIndex === -1 || websiteIndex === -1 || logoIndex === -1) return

        const rows = Array.from(table.querySelectorAll('.notion-table-body .notion-table-row'))
        if (!rows.length) return

        const cards = rows.map(row => {
          const cells = Array.from(row.querySelectorAll(':scope > .notion-table-cell'))
          const companyCell = cells[companyIndex]
          const websiteCell = cells[websiteIndex]
          const supportCell = supportIndex > -1 ? cells[supportIndex] : null
          const logoCell = cells[logoIndex]
          if (!companyCell) return null

          const companyName = companyCell.textContent?.replace(/\s+/g, ' ').trim() || ''
          if (!companyName) return null

          const linkFromAnchor = websiteCell?.querySelector('a[href]')?.getAttribute('href') || ''
          const linkFromText = websiteCell?.textContent?.replace(/\s+/g, ' ').trim() || ''
          const website = normalizeExternalUrl(linkFromAnchor || linkFromText)
          const logoImage = logoCell?.querySelector('img')
          const logoFileLink = logoCell?.querySelector('a.notion-property-file[href], a[href]')
          const logoSrc = logoImage?.getAttribute('src') ||
            logoImage?.getAttribute('data-src') ||
            logoFileLink?.getAttribute('href') ||
            ''
          const supportTags = supportCell
            ? Array.from(supportCell.querySelectorAll('.notion-property-select-item, .notion-property-multi_select-item'))
              .map(el => el.textContent?.trim() || '')
              .filter(Boolean)
            : []

          return { companyName, website, logoSrc, supportTags }
        }).filter(Boolean)

        if (!cards.length) return

        const grid = document.createElement('div')
        grid.className = 'ventures-logo-grid'

        cards.forEach(cardData => {
          const card = cardData.website ? document.createElement('a') : document.createElement('div')
          card.className = 'ventures-logo-card'
          if (cardData.website && card instanceof HTMLAnchorElement) {
            card.href = cardData.website
            card.target = '_blank'
            card.rel = 'noreferrer noopener'
          }

          const visual = document.createElement('div')
          visual.className = 'ventures-logo-visual'

          if (cardData.logoSrc) {
            const img = document.createElement('img')
            img.className = 'ventures-logo-image'
            img.src = cardData.logoSrc
            img.alt = `${cardData.companyName} logo`
            visual.appendChild(img)
          } else {
            const placeholder = document.createElement('div')
            placeholder.className = 'ventures-logo-placeholder'
            placeholder.textContent = getInitials(cardData.companyName)
            visual.appendChild(placeholder)
          }

          const overlay = document.createElement('div')
          overlay.className = 'ventures-logo-overlay'

          const name = document.createElement('span')
          name.className = 'ventures-logo-name'
          name.textContent = cardData.companyName

          const tags = document.createElement('div')
          tags.className = 'ventures-logo-tags'
          cardData.supportTags.forEach(tagText => {
            const tag = document.createElement('span')
            tag.className = 'ventures-logo-tag'
            tag.textContent = tagText
            tags.appendChild(tag)
          })

          overlay.appendChild(name)
          overlay.appendChild(tags)
          card.appendChild(visual)
          card.appendChild(overlay)
          grid.appendChild(card)
        })

        const collection = table.closest('.notion-collection')
        const isVenturesTitle = (element) => {
          return ((element?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase() === 'schub ventures')
        }

        const collectionHeader = collection?.querySelector('.notion-collection-header')
        if (collectionHeader && isVenturesTitle(collectionHeader)) {
          collectionHeader.remove()
        }

        const titleBeforeCollection = collection?.previousElementSibling
        if (titleBeforeCollection && isVenturesTitle(titleBeforeCollection)) {
          titleBeforeCollection.remove()
        }

        const titleBeforeTable = table.previousElementSibling
        if (titleBeforeTable && isVenturesTitle(titleBeforeTable)) {
          titleBeforeTable.remove()
        }

        table.style.display = 'none'
        table.insertAdjacentElement('afterend', grid)
        table.dataset.venturesGrid = 'true'
      })
    }

    transformVenturesTables()

    const observer = new MutationObserver(() => {
      transformVenturesTables()
    })
    observer.observe(notionPage, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [post.slug])

  return (
    <article
      className={cn('flex flex-col', fullWidth ? 'md:px-24' : 'items-center')}
      data-post-slug={post.slug}
    >
      {post.slug !== 'home' && post.slug !== 'about' && post.slug !== 'manifesto' && (
        <h1 className={cn(
          'w-full font-bold text-3xl text-black dark:text-white font-mono tracking-tight',
          { 'max-w-2xl px-4': !fullWidth && !isPage },
          { 'max-w-6xl px-4': !fullWidth && isPage }
        )}>
          {post.title}
        </h1>
      )}
      {!isPage && (
        <nav className={cn(
          'w-full flex mt-7 items-start text-gray-500 dark:text-gray-400',
          { 'max-w-2xl px-4': !fullWidth }
        )}>
          <div className="flex mb-4">
            <a href={BLOG.socialLink || '#'} className="flex">
              <Image
                alt={BLOG.author}
                width={24}
                height={24}
                src={`https://gravatar.com/avatar/${emailHash}`}
                className="rounded-full"
              />
              <p className="ml-2 md:block">{BLOG.author}</p>
            </a>
            <span className="block">&nbsp;/&nbsp;</span>
          </div>
          <div className="mr-2 mb-4 md:ml-0">
            <FormattedDate date={post.date} />
          </div>
          {post.tags && (
            <div className="flex flex-nowrap max-w-full overflow-x-auto article-tags">
              {post.tags.map(tag => (
                <TagItem key={tag} tag={tag} />
              ))}
            </div>
          )}
        </nav>
      )}
      <div className={cn(
        'self-stretch -mt-4 flex flex-col items-center',
        !isPage && 'lg:flex-row lg:items-stretch'
      )}>
        {!fullWidth && !isPage && <div className="flex-1 hidden lg:block" />}
        <div
          ref={notionRootRef}
          className={cn({
            'flex-1 pr-4': fullWidth,
            'flex-none w-full max-w-6xl px-4': !fullWidth && isPage,
            'flex-none w-full max-w-2xl px-4': !fullWidth && !isPage
          })}
        >
          <NotionRenderer recordMap={blockMap} fullPage={false} darkMode={dark} />
        </div>
        {!isPage && (
          <div className={cn('order-first lg:order-[unset] w-full lg:w-auto max-w-2xl lg:max-w-[unset] lg:min-w-[160px]', fullWidth ? 'flex-none' : 'flex-1')}>
            {/* `65px` is the height of expanded nav */}
            <TableOfContents blockMap={blockMap} className="pt-3 sticky" style={{ top: '65px' }} />
          </div>
        )}
      </div>
    </article>
  )
}

Post.propTypes = {
  post: PropTypes.object.isRequired,
  blockMap: PropTypes.object.isRequired,
  emailHash: PropTypes.string.isRequired,
  fullWidth: PropTypes.bool
}
