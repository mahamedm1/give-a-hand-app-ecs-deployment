variable "vpc_id" {
  type        = string
  description = "ID of the VPC"
}

variable "alb_name" {
  type        = string
  description = "Name for the ALB"
}

variable "alb_sg_id" {
  type        = string
  description = "ID of the ALB Security Group"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "ID of the subnets"
}

variable "target_group_name" {
  type        = string
  description = "Name of Target Group"
}
