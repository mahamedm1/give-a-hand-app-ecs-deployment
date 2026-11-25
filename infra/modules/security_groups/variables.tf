variable "vpc_id" {
  type        = string
  description = "ID of our VPC"
}


variable "sg_name" {
  type        = string
  description = "Security Group name"
}

variable "https_cidr" {
  type        = string
  description = "Inbound CIDR addresses accepted by the ALB"
}