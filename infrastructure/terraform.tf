# Terraform configuration
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.4"
    }
  }

  # Backend configuration for state management
  # Uncomment and configure when ready to use remote state
  /*
  backend "s3" {
    bucket         = "your-terraform-state-bucket"
    key            = "notification/firehose/terraform.tfstate"
    region         = "ap-northeast-2"
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
  */
}

# AWS Provider configuration
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = var.default_tags
  }
}

# Random provider for unique resource naming
provider "random" {} 