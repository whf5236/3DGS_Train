import mitt from 'mitt'

type Events = {
  'process-folder': { folder_name: string }
  'refresh-folders': void
  'point-cloud-processed': {
    folder_name: string
    output_folder: string
    status: string
  }
}

export const eventBus = mitt<Events>()