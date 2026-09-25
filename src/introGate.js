// Portão da intro da home.
//
// A intro roda uma animação 3D de ~2,5s. Qualquer setState na RAIZ da árvore durante esse
// período re-renderiza tudo (App + páginas) e engasga a animação — e o restore de sessão
// (`/api/auth/me` no AuthProvider) caía exatamente aí. Então: a requisição sai na hora
// (rede não custa main thread), mas o commit do estado espera o portão abrir.
//
// O portão abre quando a intro começa a encher o anel (o 3D já apareceu), ou na hora se
// não existe intro nessa carga — e tem uma rede de segurança caso algo dê errado.

const playsIntro = (() => {
  if (typeof window === 'undefined') return false
  if (window.location.pathname !== '/') return false
  try { return sessionStorage.getItem('elixir_intro_done') !== '1' } catch { return false }
})()

let open = !playsIntro
const waiting = []

export function releaseIntroGate() {
  if (open) return
  open = true
  waiting.splice(0).forEach(fn => { try { fn() } catch { /* um waiter não derruba os outros */ } })
}

export function afterIntro(fn) {
  if (open) fn()
  else waiting.push(fn)
}

// Rede de segurança: se a intro quebrar antes de abrir o portão, o app não fica preso.
if (playsIntro) setTimeout(releaseIntroGate, 6000)
