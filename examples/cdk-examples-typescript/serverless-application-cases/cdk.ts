#!/usr/bin/env node
import cdk = require('@aws-cdk/cdk');
import { CronJob, NotificationsProcessing, RealTimeDataProcessing, WebMobileBackend } from './index';

const app = new cdk.App();
new CronJob(app, 'CronJob');
new WebMobileBackend(app, 'WebMobileBackend');
new NotificationsProcessing(app, 'NotificationsProcessing');
new RealTimeDataProcessing(app, 'RealTimeDataProcessing');
app.run();
