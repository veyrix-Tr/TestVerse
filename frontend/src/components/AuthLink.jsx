import { Link } from 'react-router-dom'

/*
  Link into /login or /signup with a view transition: the clicked element is
  named `auth-panel` for this one navigation, so it morphs into the auth
  page's form (which carries the same name). The animation itself lives in
  index.css; browsers without view transitions just navigate.
*/
export default function AuthLink({ onClick, ...props }) {
  function handleClick(e) {
    onClick?.(e)
    const el = e.currentTarget
    el.style.viewTransitionName = 'auth-panel'
    // Clear it once the new page is in place, so the name stays unique
    setTimeout(() => {
      el.style.viewTransitionName = ''
    }, 1000)
  }
  return <Link viewTransition onClick={handleClick} {...props} />
}
