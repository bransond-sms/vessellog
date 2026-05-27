// Reusable placeholder for modules not yet built
export default function Placeholder({ title, icon, description }) {
  return (
    <div className="placeholder-page">
      <div className="placeholder-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{description || 'This module is under construction.'}</p>
    </div>
  )
}
