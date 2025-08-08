import { createClient } from '@libsql/client'
import { getTursoConfig } from '#utils/env-config'

const config = getTursoConfig()

const client = createClient({
  url: config.url,
  authToken: config.authToken,
})

export default client
