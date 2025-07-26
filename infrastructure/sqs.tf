# SQS Queue for notifications
resource "aws_sqs_queue" "notification_queue" {
  name                       = "${var.environment}-notification-queue"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 1209600  # 14 days
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notification_dlq.arn
    maxReceiveCount     = 3
  })

  tags = merge(var.default_tags, {
    Name = "${var.environment}-notification-queue"
  })
}

# Dead Letter Queue
resource "aws_sqs_queue" "notification_dlq" {
  name                       = "${var.environment}-notification-dlq"
  message_retention_seconds  = 1209600  # 14 days

  tags = merge(var.default_tags, {
    Name = "${var.environment}-notification-dlq"
  })
}

# IAM Role for Application (EC2/ECS)
resource "aws_iam_role" "app_role" {
  name = "${var.environment}-schoolhub-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = [
            "ec2.amazonaws.com",
            "ecs-tasks.amazonaws.com"
          ]
        }
      }
    ]
  })

  tags = merge(var.default_tags, {
    Name = "${var.environment}-schoolhub-app-role"
  })
}

# IAM Policy for SQS access
resource "aws_iam_role_policy" "app_sqs_policy" {
  name = "${var.environment}-schoolhub-sqs-policy"
  role = aws_iam_role.app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = [
          aws_sqs_queue.notification_queue.arn,
          aws_sqs_queue.notification_dlq.arn
        ]
      }
    ]
  })
}

# Instance Profile for EC2
resource "aws_iam_instance_profile" "app_profile" {
  name = "${var.environment}-schoolhub-app-profile"
  role = aws_iam_role.app_role.name
}

# Outputs
output "notification_queue_url" {
  description = "URL of the notification SQS queue"
  value       = aws_sqs_queue.notification_queue.url
}

output "notification_dlq_url" {
  description = "URL of the notification DLQ"
  value       = aws_sqs_queue.notification_dlq.url
}

output "app_role_arn" {
  description = "ARN of the application IAM role"
  value       = aws_iam_role.app_role.arn
}

output "app_instance_profile_arn" {
  description = "ARN of the application instance profile"
  value       = aws_iam_instance_profile.app_profile.arn
} 