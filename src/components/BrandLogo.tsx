const marks = [{ page:'draw', file:'02-orbit' },{ page:'library', file:'03-draw-cards' },{ page:'tournament', file:'01-crossroads' }]
/** The disc is the primary mark; each workspace gets a related menu mark. */
export default function BrandLogo({ page = 'draw' }: { page?: string }) {
  const current = marks.some(mark => mark.page === page) ? page : 'draw'
  return <span className="brand-logo" aria-hidden="true">{marks.map(mark => <span key={mark.page} className={`brand-logo-image${mark.page === current ? ' is-current' : ''}`}><img className="brand-light" src={`/logo-concepts/${mark.file}.png`} width={2172} height={724} alt="" decoding="async"/><img className="brand-dark" src={`/logo-concepts/${mark.file}-dark.png`} width={2172} height={724} alt="" decoding="async"/></span>)}</span>
}
