import { envsafe, str, bool } from "envsafe";

export const env = envsafe({
  cloud_name: str(),
  api_key: str(),
  api_secret: str(),
  folder: str(),
  BACKUP_DATABASE_URL: str({
    desc: 'The connection string of the database to backup.'
  }),
  BACKUP_CRON_SCHEDULE: str({
    desc: 'The cron schedule to run the backup on.',
    default: '0 5 * * *',
    allowEmpty: true
  }),
  AWS_S3_ENDPOINT: str({
    desc: 'The S3 custom endpoint you want to use.',
    default: '',
    allowEmpty: true,
  }),
  RUN_ON_STARTUP: bool({
    desc: 'Run a backup on startup of this application',
    default: false,
    allowEmpty: true,
  })
})