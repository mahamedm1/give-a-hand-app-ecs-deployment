variable "vpc_id" {
  type        = string
  description = "ID of our VPC"
}


variable "alb_sg_name" {
  type        = string
  description = "Security Group name ALB"
}

variable "ecs_sg_name" {
  type        = string
  description = "Security Group name for ECS"
}

variable "https_cidr" {
  type        = string
  description = "Inbound CIDR addresses accepted by the ALB"
}
