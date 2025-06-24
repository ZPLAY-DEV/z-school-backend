#!/bin/bash

## create s3 bucket
awslocal --endpoint-url=http://localhost:4566 s3 mb s3://afterschool-files-bucket

## set the bucket policy
awslocal s3api put-bucket-policy \
  --bucket afterschool-files-bucket \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "PublicReadGetObject",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": "arn:aws:s3:::afterschool-files-bucket/*"
      }
    ]
  }'

## set CORS configuration
awslocal s3api put-bucket-cors \
  --bucket afterschool-files-bucket \
  --cors-configuration '{"CORSRules":[{"AllowedOrigins":["*"],"AllowedMethods":["GET","PUT","POST","DELETE"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag"]}]}'
