# DynamoDB Table for attendance records
resource "aws_dynamodb_table" "attendance_table" {
  name           = "${var.environment}_attendance_table"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "groupKey"
  range_key      = "dailyStudentKey"

  attribute {
    name = "groupKey"
    type = "S"
  }

  attribute {
    name = "dailyStudentKey"
    type = "S"
  }

  tags = merge(var.default_tags, {
    Name = "${var.environment}-attendance-table"
  })
}

# IAM Policy for DynamoDB access
resource "aws_iam_role_policy" "app_dynamodb_policy" {
  name = "${var.environment}-schoolhub-dynamodb-policy"
  role = aws_iam_role.app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:TransactWriteItems",
          "dynamodb:TransactGetItems"
        ]
        Resource = [
          aws_dynamodb_table.attendance_table.arn,
          "${aws_dynamodb_table.attendance_table.arn}/index/*"
        ]
      }
    ]
  })
}

# Outputs
output "attendance_table_name" {
  description = "Name of the attendance DynamoDB table"
  value       = aws_dynamodb_table.attendance_table.name
}

output "attendance_table_arn" {
  description = "ARN of the attendance DynamoDB table"
  value       = aws_dynamodb_table.attendance_table.arn
} 