# Variables for Firehose notification infrastructure

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "aws_region" {
  description = "AWS region for infrastructure deployment"
  type        = string
  default     = "ap-northeast-2"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "zs-notification"
}

# Firehose configuration variables
variable "firehose_buffer_size" {
  description = "Firehose buffer size in MB"
  type        = number
  default     = 64
  
  validation {
    condition     = var.firehose_buffer_size >= 1 && var.firehose_buffer_size <= 128
    error_message = "Buffer size must be between 1 and 128 MB."
  }
}

variable "firehose_buffer_interval" {
  description = "Firehose buffer interval in seconds"
  type        = number
  default     = 60
  
  validation {
    condition     = var.firehose_buffer_interval >= 60 && var.firehose_buffer_interval <= 900
    error_message = "Buffer interval must be between 60 and 900 seconds."
  }
}

# S3 lifecycle configuration
variable "s3_transition_to_ia_days" {
  description = "Days after which objects transition to IA storage class"
  type        = number
  default     = 30
}

variable "s3_transition_to_glacier_days" {
  description = "Days after which objects transition to Glacier storage class"
  type        = number
  default     = 90
}

variable "s3_expiration_days" {
  description = "Days after which objects are deleted"
  type        = number
  default     = 730  # 2 years
}

# CloudWatch log retention
variable "cloudwatch_log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

# Tags
variable "default_tags" {
  description = "Default tags to apply to all resources"
  type        = map(string)
  default = {
    Project   = "zs-notification"
    ManagedBy = "terraform"
    Service   = "notification-analytics"
  }
} 