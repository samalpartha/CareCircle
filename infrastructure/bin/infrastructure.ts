#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CareCircleStack } from '../lib/carecircle-stack';

const app = new cdk.App();

new CareCircleStack(app, 'CareCircleStack2', {
  env: {
    region: 'us-east-1',
  },
  description: 'CareCircle - AI-Powered Family Care Orchestration Platform',
});

