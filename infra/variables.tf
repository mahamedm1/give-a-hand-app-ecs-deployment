variable "project_name" {
  type = string
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

variable "subnet_cidrs" {
  type        = list(string)
  description = "CIDR ranges for the subnets"
}

variable "https_cidr" {
  type        = string
  description = "Inbound CIDR addresses accepted by the ALB"
}

