# Athena configuration for querying notification logs
# with type partitioning (role partitioning removed)

# S3 Bucket for Athena query results
resource "aws_s3_bucket" "athena_results" {
  bucket = "${var.environment}-athena-notification-results-${random_id.athena_bucket_suffix.hex}"

  tags = {
    Name        = "athena-notification-results"
    Environment = var.environment
    Service     = "athena"
    Purpose     = "query-results"
  }
}

resource "random_id" "athena_bucket_suffix" {
  byte_length = 4
}

# S3 Bucket versioning for Athena results
resource "aws_s3_bucket_versioning" "athena_results" {
  bucket = aws_s3_bucket.athena_results.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket encryption for Athena results
resource "aws_s3_bucket_server_side_encryption_configuration" "athena_results" {
  bucket = aws_s3_bucket.athena_results.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Bucket lifecycle for Athena results (shorter retention)
resource "aws_s3_bucket_lifecycle_configuration" "athena_results" {
  bucket = aws_s3_bucket.athena_results.id

  rule {
    id     = "athena_results_lifecycle"
    status = "Enabled"

    # Delete query results after 30 days
    expiration {
      days = 30
    }

    # Delete incomplete multipart uploads after 1 day
    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# Athena Workgroup for notification analytics
resource "aws_athena_workgroup" "notification_analytics" {
  name = "${var.environment}-notification-analytics"
  
  configuration {
    enforce_workgroup_configuration    = true
    publish_cloudwatch_metrics_enabled = true
    
    result_configuration {
      output_location = "s3://${aws_s3_bucket.athena_results.bucket}/results/"
      
      encryption_configuration {
        encryption_option = "SSE_S3"
      }
    }
  }

  tags = {
    Name        = "notification-analytics-workgroup"
    Environment = var.environment
    Service     = "athena"
    Purpose     = "notification-analytics"
  }
}

# Glue Database for notification logs
resource "aws_glue_catalog_database" "notification_logs" {
  name = "${var.environment}_notification_logs"
  
  description = "Database for notification logs with type partitioning"

  # Create in default catalog
}

# Glue Table for notification logs with type partitioning
resource "aws_glue_catalog_table" "notification_logs" {
  name          = "notification_logs"
  database_name = aws_glue_catalog_database.notification_logs.name
  description   = "Notification logs table with type dynamic partitioning (parent logs only)"

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "classification"                   = "json"
    "compressionType"                  = "gzip"
    "typeOfData"                       = "file"
    "skip.header.line.count"           = "0"
    "serialization.format"             = "1"
    "projection.enabled"               = "true"
    "projection.year.type"             = "integer"
    "projection.year.range"            = "2024,2030"
    "projection.year.interval"         = "1"
    "projection.month.type"            = "integer"
    "projection.month.range"           = "1,12"
    "projection.month.interval"        = "1"
    "projection.month.digits"          = "2"
    "projection.day.type"              = "integer"
    "projection.day.range"             = "1,31"
    "projection.day.interval"          = "1"
    "projection.day.digits"            = "2"
    "projection.hour.type"             = "integer"
    "projection.hour.range"            = "0,23"
    "projection.hour.interval"         = "1"
    "projection.hour.digits"           = "2"
    "projection.school.type"           = "integer"
    "projection.school.range"          = "1,999999"
    "projection.school.interval"       = "1"
    "projection.type.type"             = "enum"
    "projection.type.values"           = "ping.exit,ping.class,ping.other,letter.registration,letter.notice,letter.survey"
    "storage.location.template"        = "s3://${aws_s3_bucket.notification_logs.bucket}/logs/year=$${year}/month=$${month}/day=$${day}/hour=$${hour}/school=$${school}/type=$${type}/"
  }

  storage_descriptor {
    location      = "s3://${aws_s3_bucket.notification_logs.bucket}/logs/"
    input_format  = "org.apache.hadoop.mapred.TextInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"

    ser_de_info {
      serialization_library = "org.openx.data.jsonserde.JsonSerDe"
      parameters = {
        "ignore.malformed.json" = "true"
      }
    }

    # Table schema
    columns {
      name = "school"
      type = "bigint"
    }
    
    columns {
      name = "school_name"
      type = "string"
    }
    
    columns {
      name = "title"
      type = "string"
    }
    
    columns {
      name = "body"
      type = "string"
    }
    
    columns {
      name = "user_ids"
      type = "array<bigint>"
    }
    
    columns {
      name = "role"
      type = "string"
      comment = "Always 'PARENT' for this table"
    }
    
    columns {
      name = "fcm_success_count"
      type = "int"
    }
    
    columns {
      name = "fcm_failure_count"
      type = "int"
    }
    
    columns {
      name = "sms_success_count"
      type = "int"
    }
    
    columns {
      name = "sms_failure_count"
      type = "int"
    }
    
    columns {
      name = "timestamp"
      type = "string"
    }
    
    columns {
      name = "total_users"
      type = "int"
    }
    
    columns {
      name = "total_success"
      type = "int"
    }
    
    columns {
      name = "total_failure"
      type = "int"
    }
    
    columns {
      name = "success_rate"
      type = "int"
    }
  }

  # Partition keys (type replaces role)
  partition_keys {
    name = "year"
    type = "string"
  }
  
  partition_keys {
    name = "month"
    type = "string"
  }
  
  partition_keys {
    name = "day"
    type = "string"
  }
  
  partition_keys {
    name = "hour"
    type = "string"
  }
  
  partition_keys {
    name = "school"
    type = "string"
  }
  
  # 🎯 New partition key: type (replaces role)
  partition_keys {
    name = "type"
    type = "string"
    comment = "Message type for efficient querying (ping.exit, ping.class, letter.notice, etc.)"
  }
}

# Pre-built saved queries for common analytics patterns
resource "aws_athena_named_query" "type_performance" {
  name      = "type_performance_analysis"
  database  = aws_glue_catalog_database.notification_logs.name
  workgroup = aws_athena_workgroup.notification_analytics.name
  
  description = "Analyze notification performance by message type"
  
  query = <<-EOT
    SELECT 
      type,
      DATE(PARSE_DATETIME(timestamp, 'yyyy-MM-dd''T''HH:mm:ss.SSSSSS+09:00')) as notification_date,
      COUNT(*) as total_notifications,
      AVG(success_rate) as avg_success_rate,
      SUM(total_users) as total_recipients,
      SUM(total_success) as total_successful_deliveries,
      SUM(total_failure) as total_failed_deliveries
    FROM "${aws_glue_catalog_database.notification_logs.name}"."${aws_glue_catalog_table.notification_logs.name}"
    WHERE year = '{year}' 
      AND month = '{month}'
      AND type = '{type}'
    GROUP BY type, DATE(PARSE_DATETIME(timestamp, 'yyyy-MM-dd''T''HH:mm:ss.SSSSSS+09:00'))
    ORDER BY notification_date DESC, type;
  EOT
}

resource "aws_athena_named_query" "school_exit_notifications" {
  name      = "school_exit_notifications_daily"
  database  = aws_glue_catalog_database.notification_logs.name
  workgroup = aws_athena_workgroup.notification_analytics.name
  
  description = "Daily exit notification performance for specific schools"
  
  query = <<-EOT
    SELECT 
      school,
      school_name,
      day,
      COUNT(*) as daily_exit_notifications,
      AVG(success_rate) as avg_daily_success_rate,
      SUM(total_users) as daily_recipients
    FROM "${aws_glue_catalog_database.notification_logs.name}"."${aws_glue_catalog_table.notification_logs.name}"
    WHERE year = '{year}'
      AND month = '{month}'
      AND type = 'ping.exit'
      AND school IN ({school_ids})
    GROUP BY school, school_name, day
    ORDER BY school, day;
  EOT
}

resource "aws_athena_named_query" "hourly_notification_patterns" {
  name      = "hourly_notification_patterns"
  database  = aws_glue_catalog_database.notification_logs.name
  workgroup = aws_athena_workgroup.notification_analytics.name
  
  description = "Hourly notification patterns by message type"
  
  query = <<-EOT
    SELECT 
      hour,
      type,
      COUNT(*) as notification_count,
      AVG(total_users) as avg_recipients_per_notification,
      AVG(success_rate) as avg_hourly_success_rate
    FROM "${aws_glue_catalog_database.notification_logs.name}"."${aws_glue_catalog_table.notification_logs.name}"
    WHERE year = '{year}'
      AND month = '{month}'
      AND day = '{day}'
    GROUP BY hour, type
    ORDER BY hour, type;
  EOT
}

# Outputs
output "athena_workgroup_name" {
  description = "Name of the Athena workgroup for notification analytics"
  value       = aws_athena_workgroup.notification_analytics.name
}

output "athena_database_name" {
  description = "Name of the Glue database for notification logs"
  value       = aws_glue_catalog_database.notification_logs.name
}

output "athena_table_name" {
  description = "Name of the Glue table for notification logs"
  value       = aws_glue_catalog_table.notification_logs.name
}

output "athena_results_bucket_name" {
  description = "Name of the S3 bucket for Athena query results"
  value       = aws_s3_bucket.athena_results.bucket
} 