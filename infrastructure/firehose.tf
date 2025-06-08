# Firehose Delivery Stream with type Dynamic Partitioning
# Parent 알림 로그 전용 (role 파티션 제거, type 파티션 추가)

resource "aws_kinesis_firehose_delivery_stream" "notification_logs" {
  name        = "notification-logs-stream"
  destination = "s3"

  s3_configuration {
    role_arn   = aws_iam_role.firehose_delivery_role.arn
    bucket_arn = aws_s3_bucket.notification_logs.arn
    
    # 🎯 type 기반 Dynamic Partitioning (role 파티션 제거)
    prefix = "logs/year=!{partitionKeyFromQuery:year}/month=!{partitionKeyFromQuery:month}/day=!{partitionKeyFromQuery:day}/hour=!{partitionKeyFromQuery:hour}/school=!{partitionKeyFromQuery:school}/type=!{partitionKeyFromQuery:type}/"
    
    error_output_prefix = "errors/"
    buffer_size        = 64
    buffer_interval    = 60
    compression_format = "GZIP"

    dynamic_partitioning {
      enabled        = true
      retry_duration = 3600
    }

    processing_configuration {
      enabled = true

      processors {
        type = "MetadataExtraction"

        parameters {
          parameter_name  = "MetadataExtractionQuery"
          # 🚀 role 제거, type 추가
          parameter_value = "{year:.year,month:.month,day:.day,hour:.hour,school:.school,type:.type}"
        }

        parameters {
          parameter_name  = "JsonParsingEngine"
          parameter_value = "JQ-1.6"
        }
      }
    }

    cloudwatch_logging_options {
      enabled         = true
      log_group_name  = aws_cloudwatch_log_group.firehose.name
      log_stream_name = "S3Delivery"
    }
  }

  tags = {
    Name        = "notification-logs-stream"
    Environment = var.environment
    Service     = "notification"
    Purpose     = "parent-log-analytics"
  }
}

# S3 Bucket for notification logs
resource "aws_s3_bucket" "notification_logs" {
  bucket = "${var.environment}-notification-logs-${random_id.bucket_suffix.hex}"

  tags = {
    Name        = "notification-logs-bucket"
    Environment = var.environment
    Service     = "notification"
    Purpose     = "parent-log-analytics"
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# S3 Bucket versioning
resource "aws_s3_bucket_versioning" "notification_logs" {
  bucket = aws_s3_bucket.notification_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "notification_logs" {
  bucket = aws_s3_bucket.notification_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Bucket lifecycle configuration for cost optimization
resource "aws_s3_bucket_lifecycle_configuration" "notification_logs" {
  bucket = aws_s3_bucket.notification_logs.id

  rule {
    id     = "notification_logs_lifecycle"
    status = "Enabled"

    # Delete incomplete multipart uploads after 7 days
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    # Transition to IA after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Transition to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Delete after 2 years (compliance requirement)
    expiration {
      days = 730
    }
  }
}

# CloudWatch Log Group for Firehose monitoring
resource "aws_cloudwatch_log_group" "firehose" {
  name              = "/aws/kinesisfirehose/notification-logs-stream"
  retention_in_days = 14

  tags = {
    Name        = "firehose-notification-logs"
    Environment = var.environment
    Service     = "notification"
  }
}

# IAM Role for Firehose
resource "aws_iam_role" "firehose_delivery_role" {
  name = "${var.environment}-firehose-notification-delivery-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "firehose.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "firehose-notification-delivery-role"
    Environment = var.environment
    Service     = "notification"
  }
}

# IAM Policy for Firehose S3 access
resource "aws_iam_role_policy" "firehose_delivery_policy" {
  name = "${var.environment}-firehose-notification-delivery-policy"
  role = aws_iam_role.firehose_delivery_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:AbortMultipartUpload",
          "s3:GetBucketLocation",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:ListBucketMultipartUploads",
          "s3:PutObject"
        ]
        Resource = [
          aws_s3_bucket.notification_logs.arn,
          "${aws_s3_bucket.notification_logs.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:PutLogEvents"
        ]
        Resource = [
          aws_cloudwatch_log_group.firehose.arn,
          "${aws_cloudwatch_log_group.firehose.arn}:*"
        ]
      }
    ]
  })
}

# Outputs for application configuration
output "firehose_delivery_stream_name" {
  description = "Name of the Firehose delivery stream"
  value       = aws_kinesis_firehose_delivery_stream.notification_logs.name
}

output "firehose_delivery_stream_arn" {
  description = "ARN of the Firehose delivery stream"
  value       = aws_kinesis_firehose_delivery_stream.notification_logs.arn
}

output "notification_logs_bucket_name" {
  description = "Name of the S3 bucket for notification logs"
  value       = aws_s3_bucket.notification_logs.bucket
}

output "notification_logs_bucket_arn" {
  description = "ARN of the S3 bucket for notification logs"
  value       = aws_s3_bucket.notification_logs.arn
} 