import mitt, { Emitter } from 'mitt'

type Events = {
  'topic-updated': string
}

const emitter: Emitter<Events> = mitt<Events>()

export default emitter
