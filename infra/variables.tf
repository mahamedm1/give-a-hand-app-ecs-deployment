variable "project_name" {
  type        = string
  description = "Name of the project"
}

variable "vpc_cidr_block" {
  type        = string
  description = "CIDR block range for the VPC"
}

variable "availability_zones" {
  type        = list(string)
  description = "Availability Zones for the VPC subnets"
}

variable "https_cidr" {
  type        = string
  description = "Inbound CIDR addresses accepted by the ALB"
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "Cidr ranges for the Subnets"
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "Cidr ranges for the Private Subnets"
}

variable "domain_name" {
  type        = string
  description = "Name of the domain"
}

variable "validation_method" {
  type        = string
  description = "Method to validate ACM certificate"
}

