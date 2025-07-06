#!/bin/bash

echo "🟢 Creating S3 buckets..."

awslocal --endpoint-url=http://localhost:4566 s3 mb s3://notification-logs-bucket
awslocal --endpoint-url=http://localhost:4566 s3 mb s3://afterschool-files-bucket

echo "🟢 Setting bucket policy..."

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

echo "🟢 Setting CORS configuration..."

awslocal s3api put-bucket-cors \
  --bucket afterschool-files-bucket \
  --cors-configuration '{"CORSRules":[{"AllowedOrigins":["*"],"AllowedMethods":["GET","PUT","POST","DELETE"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag"]}]}'

echo "🟢 Creating Firehose delivery stream..."

awslocal --endpoint-url=http://localhost:4566 firehose create-delivery-stream \
  --delivery-stream-name notification-logs-stream \
  --delivery-stream-type DirectPut \
  --s3-destination-configuration '{
      "RoleARN": "arn:aws:iam::000000000000:role/firehose_delivery_role",
      "BucketARN": "arn:aws:s3:::notification-logs-bucket",
      "Prefix": "logs/",
      "BufferingHints": {
        "SizeInMBs": 1,
        "IntervalInSeconds": 60
      },
      "CompressionFormat": "UNCOMPRESSED"
  }'
