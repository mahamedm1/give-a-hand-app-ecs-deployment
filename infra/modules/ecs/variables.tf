variable "ecs_cluster_name" {
    type = string
    description = "Name of the ECS Cluster"
}

variable "task_definition_family" {
    type = string 
    description = "Family of the Task Definition"
}

variable "task_definition_name" {
    type = string
    description = "Name of the Task Definition"
}

variable "task_definition_image" {
    type = string
    description = "Image used to start a container."
}

variable "task_definition_cpu" {
    type = string
    description = "Total CPU used for the task"
}

variable "task_definition_memory" {
    type = string
    description = "Total Memory needed to present the container"
}

variable "execution_role_arn" {
    type = string
    description = "ARN of the task execution role"
}

variable "service_name" {
    type = string
    description = "Name of the service"
}

variable "service_desired_count" {
    type = string
    description = "Number of instances of the task definition to place and run"
}

